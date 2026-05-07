import apiClient from './client';
import type { UserDashboard } from '../types/dashboard';

export async function getUserDashboard(): Promise<UserDashboard> {
  const response = await apiClient.get<UserDashboard>('/users/dashboard');
  return response.data;
}
