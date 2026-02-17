import apiClient from './client';
import type { Caso, CasoCreate, CasoUpdate, CasoDetail } from '../types/caso';

export async function getCasos(offset = 0, limit = 50): Promise<Caso[]> {
  const response = await apiClient.get<Caso[]>('/casos/', { params: { offset, limit } });
  return response.data;
}

export async function getRecentCasos(): Promise<Caso[]> {
  const response = await apiClient.get<Caso[]>('/casos/recent');
  return response.data;
}

export async function getRecentCasosActive(): Promise<Caso[]> {
  const response = await apiClient.get<Caso[]>('/casos/recent/active');
  return response.data;
}

export async function getCaso(id: number): Promise<Caso> {
  const response = await apiClient.get<Caso>(`/casos/${id}`);
  return response.data;
}

export async function createCaso(data: CasoCreate): Promise<Caso> {
  const response = await apiClient.post<Caso>('/casos/', data);
  return response.data;
}

export async function updateCaso(id: number, data: CasoUpdate): Promise<Caso> {
  const response = await apiClient.patch<Caso>(`/casos/${id}`, data);
  return response.data;
}

export async function archiveCaso(id: number): Promise<Caso> {
  const response = await apiClient.delete<Caso>(`/casos/${id}`);
  return response.data;
}

export async function getCasoDetail(id: number): Promise<CasoDetail> {
  const response = await apiClient.get<CasoDetail>(`/casos/${id}/detail`);
  return response.data;
}
