import { api } from './client';
import type { AuthResponse, CurrentUser, LoginRequest, RegisterRequest } from './types';

export const authApi = {
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  register: (body: RegisterRequest) => api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
  me: () => api.get<CurrentUser>('/auth/me').then((r) => r.data),
};
