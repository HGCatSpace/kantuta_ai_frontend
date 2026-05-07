import apiClient from './client';
import type { ReporteActividad } from '../types/reporte';

export async function getReporteActividad(): Promise<ReporteActividad> {
  const response = await apiClient.get<ReporteActividad>('/reportes/actividad');
  return response.data;
}
