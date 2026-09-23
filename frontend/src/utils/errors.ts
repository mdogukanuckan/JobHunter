import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';

/**
 * API hatasini kullaniciya gosterilecek metne cevirir.
 *  - Is kurali hatalari: { message: "..." }  (backend'in kendi mesaji)
 *  - Model validation hatalari: ASP.NET ProblemDetails { errors: { Alan: ["..."] } }
 *  - Ag hatasi / bilinmeyen: genel ceviri metni
 */
export function getErrorMessage(error: unknown, t: TFunction): string {
  if (isAxiosError(error)) {
    if (!error.response) return t('errors.network');

    const data = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.message) return data.message;
    if (data?.errors) {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
  }
  return t('errors.generic');
}
