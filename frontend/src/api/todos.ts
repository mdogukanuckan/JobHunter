import { api } from './client';
import type { Todo, TodoPriority } from './types';

export const todoKeys = {
  all: ['todos'] as const,
};

/**
 * Olusturma ve guncelleme (PUT) icin ortak govde.
 * Sadece interviewId verilirse backend basvuruyu mulakattan kendisi bulur.
 */
export interface TodoRequest {
  title: string;
  description: string | null;
  /** Saat dilimli ISO metin ya da null (son tarih yok). */
  dueAt: string | null;
  priority: TodoPriority;
  jobApplicationId: string | null;
  interviewId: string | null;
}

export const todosApi = {
  /** Tum gorevler. Kisisel kullanimda sayi az; gruplama/filtreleme istemcide yapiliyor (Mulakatlar sayfasi gibi). */
  list: () => api.get<Todo[]>('/todos').then((r) => r.data),
  create: (body: TodoRequest) => api.post<Todo>('/todos', body).then((r) => r.data),
  update: (id: string, body: TodoRequest) => api.put<Todo>(`/todos/${id}`, body).then((r) => r.data),
  setCompletion: (id: string, isCompleted: boolean) =>
    api.patch<Todo>(`/todos/${id}/complete`, { isCompleted }).then((r) => r.data),
  remove: (id: string) => api.delete(`/todos/${id}`).then(() => undefined),
};
