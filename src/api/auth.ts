import apiClient from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_data: {
    nombre: string;
    email: string;
    rol_nombre?: string | null;
    actions?: string[];
  };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await apiClient.post<LoginResponse>('/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}
