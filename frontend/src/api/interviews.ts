import { api } from './client';
import type { Interview, InterviewFormat, InterviewOutcome, InterviewType } from './types';

export const interviewKeys = {
  all: ['interviews'] as const,
};

/** Olusturma/guncellemede ortak alanlar. scheduledAt: saat dilimli ISO metin (orn. toISOString()). */
export interface InterviewFields {
  scheduledAt: string;
  durationMinutes: number | null;
  type: InterviewType;
  format: InterviewFormat;
  location: string | null;
  meetingUrl: string | null;
  interviewers: string | null;
  preparationNotes: string | null;
}

export interface CreateInterviewRequest extends InterviewFields {
  jobApplicationId: string;
}

export interface UpdateInterviewRequest extends InterviewFields {
  feedbackNotes: string | null;
}

export const interviewsApi = {
  /** Tum mulakatlar (tarihe gore artan). Kisisel kullanimda sayi az; filtreleme istemcide yapiliyor. */
  list: () => api.get<Interview[]>('/interviews').then((r) => r.data),
  create: (body: CreateInterviewRequest) => api.post<Interview>('/interviews', body).then((r) => r.data),
  update: (id: string, body: UpdateInterviewRequest) => api.put<Interview>(`/interviews/${id}`, body).then((r) => r.data),
  setOutcome: (id: string, outcome: InterviewOutcome, feedbackNotes: string | null = null) =>
    api.patch<Interview>(`/interviews/${id}/outcome`, { outcome, feedbackNotes }).then((r) => r.data),
  remove: (id: string) => api.delete(`/interviews/${id}`).then(() => undefined),
};
