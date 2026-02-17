import apiClient from './client';
import type { SystemPrompt, SystemPromptCreate, SystemPromptUpdate } from '../types/prompt';

interface GetPromptsParams {
  offset?: number;
  limit?: number;
  search?: string;
  es_activo?: boolean;
}

export async function getPrompts(params: GetPromptsParams = {}): Promise<SystemPrompt[]> {
  const response = await apiClient.get<SystemPrompt[]>('/prompts/', { params });
  return response.data;
}

export async function getPromptsCount(params: Pick<GetPromptsParams, 'search' | 'es_activo'> = {}): Promise<number> {
  const response = await apiClient.get<{ total: number }>('/prompts/count', { params });
  return response.data.total;
}

export async function getPrompt(id: number): Promise<SystemPrompt> {
  const response = await apiClient.get<SystemPrompt>(`/prompts/${id}`);
  return response.data;
}

export async function createPrompt(data: SystemPromptCreate): Promise<SystemPrompt> {
  const response = await apiClient.post<SystemPrompt>('/prompts/', data);
  return response.data;
}

export async function updatePrompt(id: number, data: SystemPromptUpdate): Promise<SystemPrompt> {
  const response = await apiClient.patch<SystemPrompt>(`/prompts/${id}`, data);
  return response.data;
}

export async function deletePrompt(id: number): Promise<SystemPrompt> {
  const response = await apiClient.delete<SystemPrompt>(`/prompts/${id}`);
  return response.data;
}
