import { api } from './client';
import type { AppearanceSettings, SecretKind, SecretStatus } from './types';

export const settingsApi = {
  getAppearance: () => api.get<AppearanceSettings>('/settings/appearance').then((r) => r.data),
  updateAppearance: (body: AppearanceSettings) => api.put<AppearanceSettings>('/settings/appearance', body).then((r) => r.data),
  getSecret: (kind: SecretKind) => api.get<SecretStatus>(`/settings/secrets/${kind}`).then((r) => r.data),
  /** Sunucu anahtari once dogrular; gecersizse 400 doner ve hicbir sey kaydedilmez. */
  setSecret: (kind: SecretKind, value: string) => api.put<SecretStatus>(`/settings/secrets/${kind}`, { value }).then((r) => r.data),
  removeSecret: (kind: SecretKind) => api.delete(`/settings/secrets/${kind}`).then(() => undefined),
};
