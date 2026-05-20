import apiClient from './client';
import type { ReporteActividad } from '../types/reporte';

export async function getReporteActividad(desde?: string, hasta?: string): Promise<ReporteActividad> {
  const params: Record<string, string> = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const response = await apiClient.get<ReporteActividad>('/reportes/actividad', { params });
  return response.data;
}
