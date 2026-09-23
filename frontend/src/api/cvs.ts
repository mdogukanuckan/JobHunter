import { api } from './client';
import type { Cv } from './types';

// 7b'de sadece listeleme gerekiyor (basvuruya CV secmek icin). Yukleme/silme 7c'de eklenecek.
export const cvKeys = {
  all: ['cvs'] as const,
};

export const cvsApi = {
  list: () => api.get<Cv[]>('/cvs').then((r) => r.data),
};
