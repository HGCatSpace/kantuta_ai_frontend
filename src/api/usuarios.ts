import apiClient from './client';
import type { Usuario, UsuarioCreate, UsuarioUpdate, Rol, Action } from '../types/usuario';

export async function getUsuarios(offset = 0, limit = 200): Promise<Usuario[]> {
  const response = await apiClient.get<Usuario[]>('/users/', { params: { offset, limit } });
  return response.data;
}

export async function getUsuariosCount(): Promise<number> {
  const response = await apiClient.get<{ total: number }>('/users/count');
  return response.data.total;
}

export async function createUsuario(data: UsuarioCreate): Promise<Usuario> {
  const response = await apiClient.post<Usuario>('/users/', data);
  return response.data;
}

export async function updateUsuario(id: number, data: UsuarioUpdate): Promise<Usuario> {
  const response = await apiClient.patch<Usuario>(`/users/${id}`, data);
  return response.data;
}

export async function getRoles(): Promise<Rol[]> {
  const response = await apiClient.get<Rol[]>('/roles/');
  return response.data;
}

export async function getActions(): Promise<Action[]> {
  const response = await apiClient.get<Action[]>('/actions/');
  return response.data;
}

export async function getUserActions(userId: number): Promise<Action[]> {
  const response = await apiClient.get<Action[]>(`/users/${userId}/actions`);
  return response.data;
}

export async function assignAction(userId: number, actionId: number): Promise<void> {
  await apiClient.post(`/users/${userId}/actions/${actionId}`);
}

export async function removeAction(userId: number, actionId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}/actions/${actionId}`);
}
