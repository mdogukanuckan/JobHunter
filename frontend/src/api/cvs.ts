import { api } from './client';
import type { Cv } from './types';

export const cvKeys = {
  all: ['cvs'] as const,
};

/** Backend ile ayni kurallar (CvService.AllowedTypes, Storage:MaxCvSizeBytes). */
export const CV_ACCEPT = '.pdf,.docx';
export const CV_MAX_BYTES = 5 * 1024 * 1024;

export const cvsApi = {
  list: () => api.get<Cv[]>('/cvs').then((r) => r.data),

  /** multipart/form-data ile yukleme. onProgress: 0-100 arasi yuzde. */
  upload: (file: File, name: string | null, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return api
      .post<Cv>('/cvs', form, {
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  rename: (id: string, name: string) => api.patch<Cv>(`/cvs/${id}`, { name }).then((r) => r.data),

  remove: (id: string) => api.delete(`/cvs/${id}`).then(() => undefined),

  /**
   * Dosyayi Blob olarak indirir. Dogrudan <a href> kullanilamaz: istek Authorization header'i gerektiriyor
   * ve access token sadece bellekte. Bu yuzden axios ile cekip tarayicida gecici bir URL olusturuyoruz.
   */
  downloadBlob: (id: string) => api.get<Blob>(`/cvs/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
};
