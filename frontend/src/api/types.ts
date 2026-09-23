// Backend DTO'larinin TypeScript karsiliklari. Alan adlari ASP.NET'in varsayilan camelCase JSON ciktisiyla ayni.

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  email: string;
  fullName: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

// ---------- Kanban (JobApplications) ----------
// Backend enum'lari JsonStringEnumConverter ile yazi olarak gonderir; TS tarafinda string union ile karsilanir.

export const APPLICATION_STATUSES = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type InterviewType = 'PhoneScreen' | 'Technical' | 'Behavioral' | 'CaseStudy' | 'Final' | 'Other';
export type InterviewFormat = 'Online' | 'Phone' | 'OnSite';
export type InterviewOutcome = 'Pending' | 'Passed' | 'Failed' | 'Cancelled';
export type TodoPriority = 'Low' | 'Medium' | 'High';

/** Pano karti (hafif model). */
export interface JobApplicationSummary {
  id: string;
  companyName: string;
  jobTitle: string;
  location: string | null;
  source: string | null;
  status: ApplicationStatus;
  position: number;
  appliedAt: string | null;
  cvId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface StatusHistoryEntry {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}

export interface Interview {
  id: string;
  jobApplicationId: string;
  companyName: string;
  jobTitle: string;
  applicationStatus: ApplicationStatus;
  scheduledAt: string;
  durationMinutes: number | null;
  type: InterviewType;
  format: InterviewFormat;
  location: string | null;
  meetingUrl: string | null;
  interviewers: string | null;
  preparationNotes: string | null;
  feedbackNotes: string | null;
  outcome: InterviewOutcome;
  createdAt: string;
  updatedAt: string | null;
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: TodoPriority;
  isCompleted: boolean;
  completedAt: string | null;
  jobApplicationId: string | null;
  companyName: string | null;
  jobTitle: string | null;
  interviewId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** Kart acildiginda gelen tam detay. */
export interface JobApplicationDetail {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  source: string | null;
  jobDescription: string | null;
  notes: string | null;
  status: ApplicationStatus;
  position: number;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  cv: { id: string; name: string; isDeleted: boolean } | null;
  statusHistory: StatusHistoryEntry[];
  interviews: Interview[];
  todos: Todo[];
}

/** Olusturma ve guncellemede ortak alanlar. */
export interface JobApplicationFields {
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  source: string | null;
  jobDescription: string | null;
  notes: string | null;
  cvId: string | null;
}

export interface CreateJobApplicationRequest extends JobApplicationFields {
  status: ApplicationStatus;
}

export type UpdateJobApplicationRequest = JobApplicationFields;

export interface MoveJobApplicationRequest {
  status: ApplicationStatus;
  position: number;
}

// ---------- CV (7c'de genisletilecek) ----------

export interface Cv {
  id: string;
  name: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string | null;
}

// ---------- Aday profili (Faz 5 + 5b) ----------

export type WorkMode = 'Remote' | 'Hybrid' | 'OnSite' | 'Flexible';
export type Gender = 'Female' | 'Male' | 'Other' | 'PreferNotToSay';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'PreferNotToSay';
export type MilitaryServiceStatus = 'Completed' | 'Exempt' | 'Postponed' | 'NotCompleted' | 'NotApplicable';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
export type EducationDegree = 'HighSchool' | 'Associate' | 'Bachelor' | 'Master' | 'Doctorate' | 'Certificate' | 'Other';
export type AutofillPolicy = 'Auto' | 'AskFirst' | 'Never';

/** Backend'deki ProfileFields sabitleriyle birebir ayni. */
export const POLICY_FIELDS = [
  'DateOfBirth',
  'Gender',
  'MaritalStatus',
  'Nationality',
  'MilitaryService',
  'DriverLicense',
  'Address',
  'Travel',
  'Smoking',
  'Disability',
  'ExpectedSalary',
  'References',
] as const;
export type PolicyField = (typeof POLICY_FIELDS)[number];

export const DRIVER_LICENSE_CLASSES = ['M', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'F', 'G'] as const;

export interface WorkExperience {
  id: string;
  companyName: string;
  title: string;
  location: string | null;
  startDate: string; // "YYYY-MM-DD" (DateOnly)
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface EducationItem {
  id: string;
  school: string;
  fieldOfStudy: string | null;
  degree: EducationDegree;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
  description: string | null;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: LanguageLevel;
}

export interface ScreeningAnswer {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

export interface CertificateItem {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export interface ReferenceItem {
  id: string;
  fullName: string;
  company: string | null;
  title: string | null;
  relationship: string | null;
  phoneNumber: string | null;
  email: string | null;
  notes: string | null;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  policy: AutofillPolicy;
}

/** Profilin ana (tekil) alanlari: PUT /api/profile govdesi ile ayni. */
export interface ProfileMainFields {
  headline: string | null;
  summary: string | null;
  phoneNumber: string | null;
  city: string | null;
  country: string | null;
  linkedInUrl: string | null;
  gitHubUrl: string | null;
  portfolioUrl: string | null;
  yearsOfExperience: number | null;
  expectedSalary: number | null;
  salaryCurrency: string | null;
  noticePeriodDays: number | null;
  preferredWorkMode: WorkMode | null;
  openToRelocation: boolean;
  requiresVisaSponsorship: boolean;
  workAuthorization: string | null;
  skills: string[];
  defaultCvId: string | null;
  district: string | null;
  addressLine: string | null;
  postalCode: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  nationality: string | null;
  militaryServiceStatus: MilitaryServiceStatus | null;
  militaryPostponedUntil: string | null;
  driverLicenseClasses: string[];
  driverLicenseYear: number | null;
  canTravel: boolean | null;
  isSmoker: boolean | null;
  hasDisability: boolean | null;
}

export interface Profile extends ProfileMainFields {
  id: string;
  fullName: string;
  email: string;
  defaultCvName: string | null;
  workExperiences: WorkExperience[];
  educations: EducationItem[];
  languages: LanguageItem[];
  screeningAnswers: ScreeningAnswer[];
  certificates: CertificateItem[];
  references: ReferenceItem[];
  customFields: CustomField[];
  fieldPolicies: Record<PolicyField, AutofillPolicy>;
  createdAt: string;
  updatedAt: string | null;
}
