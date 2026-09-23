import { api } from './client';
import type {
  CreateJobApplicationRequest,
  JobApplicationDetail,
  JobApplicationSummary,
  MoveJobApplicationRequest,
  UpdateJobApplicationRequest,
} from './types';

/*
 * TanStack Query anahtarlari tek yerde tanimlanir.
 * Hepsi 'jobApplications' ile basladigi icin invalidateQueries({ queryKey: jobApplicationKeys.all })
 * hem panoyu hem de acik kart detaylarini tek seferde yeniler.
 */
export const jobApplicationKeys = {
  all: ['jobApplications'] as const,
  board: () => [...jobApplicationKeys.all, 'board'] as const,
  detail: (id: string) => [...jobApplicationKeys.all, 'detail', id] as const,
};

export const jobApplicationsApi = {
  getBoard: () => api.get<JobApplicationSummary[]>('/job-applications').then((r) => r.data),
  getById: (id: string) => api.get<JobApplicationDetail>(`/job-applications/${id}`).then((r) => r.data),
  create: (body: CreateJobApplicationRequest) =>
    api.post<JobApplicationDetail>('/job-applications', body).then((r) => r.data),
  update: (id: string, body: UpdateJobApplicationRequest) =>
    api.put<JobApplicationDetail>(`/job-applications/${id}`, body).then((r) => r.data),
  move: (id: string, body: MoveJobApplicationRequest) =>
    api.patch<JobApplicationSummary>(`/job-applications/${id}/move`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/job-applications/${id}`).then(() => undefined),
};
