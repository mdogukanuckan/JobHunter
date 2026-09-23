// Backend DTO'larinin TypeScript karsiliklari. Alan adlari ASP.NET'in varsayilan camelCase JSON ciktisiyla ayni.

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  email: string;
  fullName: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}
