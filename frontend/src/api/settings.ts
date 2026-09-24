import { api } from './client';
import type { AppearanceSettings } from './types';

export const settingsApi = {
  getAppearance: () => api.get<AppearanceSettings>('/settings/appearance').then((r) => r.data),
  updateAppearance: (body: AppearanceSettings) => api.put<AppearanceSettings>('/settings/appearance', body).then((r) => r.data),
};
