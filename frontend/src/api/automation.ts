import { api } from './client';
import type { ApproveAutomationPayload, AutomationJob, AutomationMode, AutomationReview } from './types';

/*
 * Otomasyon denemeleri (AutomationJobsController, JWT ile).
 * n8n'in cagirdigi callback endpoint'leri (X-Automation-Key) frontend'i ilgilendirmez.
 */
export const automationKeys = {
  all: ['automationJobs'] as const,
  list: () => [...automationKeys.all, 'list'] as const,
  detail: (id: string) => [...automationKeys.all, 'detail', id] as const,
  review: (id: string) => [...automationKeys.all, 'review', id] as const,
};

export const automationApi = {
  /** Tum denemeler, en yeni en ustte (events olmadan). Kisisel kullanimda sayi az: filtreleme istemcide. */
  list: () => api.get<AutomationJob[]>('/automation-jobs').then((r) => r.data),
  /** Deneme + adim adim gunluk. */
  getById: (id: string) => api.get<AutomationJob>(`/automation-jobs/${id}`).then((r) => r.data),
  /** Yeni deneme: backend Queued olarak kaydeder ve n8n webhook'unu tetikler. */
  start: (jobApplicationId: string, mode: AutomationMode) =>
    api.post<AutomationJob>(`/job-applications/${jobApplicationId}/automation-jobs`, { mode }).then((r) => r.data),
  cancel: (id: string, reason: string | null = null) =>
    api.post<AutomationJob>(`/automation-jobs/${id}/cancel`, { reason }).then((r) => r.data),

  // ---- Faz 11: onay ekrani ----
  /** Doldurma turunun inceleme raporu. Fill turu henuz calismadiysa report null doner. */
  getReview: (id: string) => api.get<AutomationReview>(`/automation-jobs/${id}/review`).then((r) => r.data),
  /** Inceleme ekran goruntusu. JWT gerektigi icin <img src> yerine blob olarak cekilip object URL'e cevrilir. */
  getReviewScreenshot: (id: string) =>
    api.get(`/automation-jobs/${id}/review-screenshot`, { responseType: 'blob' }).then((r) => r.data as Blob),
  /** Onay ekranindan cevaplari (TC kimlik dahil olabilir) ve KVKK onayini gonderir; is Submit icin n8n'e tekrar dusurulur. */
  approve: (id: string, body: ApproveAutomationPayload) =>
    api.post<AutomationJob>(`/automation-jobs/${id}/approve`, body).then((r) => r.data),
};
