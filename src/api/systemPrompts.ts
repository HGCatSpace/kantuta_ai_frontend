import apiClient from './client';
import type { SystemPrompt } from '../types/systemPrompt';

export async function getActiveSystemPrompts(): Promise<SystemPrompt[]> {
    const response = await apiClient.get<SystemPrompt[]>('/prompts/', {
        params: { es_activo: true, limit: 100 },
    });
    return response.data;
}
