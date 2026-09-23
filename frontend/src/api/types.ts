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
