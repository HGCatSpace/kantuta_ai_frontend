import apiClient from './client';
import type { DocumentoConocimiento, DocumentoUpdate } from '../types/documento';

interface GetDocumentosParams {
  offset?: number;
  limit?: number;
  search?: string;
  categoria?: string;
}

export async function getDocumentos(params: GetDocumentosParams = {}): Promise<DocumentoConocimiento[]> {
  const response = await apiClient.get<DocumentoConocimiento[]>('/conocimiento/', { params });
  return response.data;
}

export async function getDocumentosCount(params: Pick<GetDocumentosParams, 'search' | 'categoria'> = {}): Promise<number> {
  const response = await apiClient.get<{ total: number }>('/conocimiento/count', { params });
  return response.data.total;
}

export async function getDocumento(id: number): Promise<DocumentoConocimiento> {
  const response = await apiClient.get<DocumentoConocimiento>(`/conocimiento/${id}`);
  return response.data;
}

export async function uploadDocumento(data: {
  archivo: File;
  titulo: string;
  categoria?: string;
  descripcion?: string;
  etiquetas?: string;
}): Promise<DocumentoConocimiento> {
  const formData = new FormData();
  formData.append('archivo', data.archivo);
  formData.append('titulo', data.titulo);
  if (data.categoria) formData.append('categoria', data.categoria);
  if (data.descripcion) formData.append('descripcion', data.descripcion);
  if (data.etiquetas) formData.append('etiquetas', data.etiquetas);

  const response = await apiClient.post<DocumentoConocimiento>('/conocimiento/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateDocumento(id: number, data: DocumentoUpdate): Promise<DocumentoConocimiento> {
  const response = await apiClient.patch<DocumentoConocimiento>(`/conocimiento/${id}`, data);
  return response.data;
}

export async function deleteDocumento(id: number): Promise<void> {
  await apiClient.delete(`/conocimiento/${id}`);
}

export function getDownloadUrl(id: number): string {
  const baseURL = apiClient.defaults.baseURL || '';
  return `${baseURL}/conocimiento/${id}/download`;
}
