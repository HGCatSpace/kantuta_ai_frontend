import apiClient from './client';
import type { ChatSession, ChatSessionCreate } from '../types/chatSession';

export async function getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await apiClient.get<ChatSession>(`/chats/${sessionId}`);
    return response.data;
}

export async function getChatsByCaso(casoId: number): Promise<ChatSession[]> {
    const response = await apiClient.get<ChatSession[]>(`/chats/caso/${casoId}`);
    return response.data;
}

export async function createChatSession(data: ChatSessionCreate): Promise<ChatSession> {
    const response = await apiClient.post<ChatSession>('/chats/', data);
    return response.data;
}

export async function archiveChat(sessionId: string): Promise<ChatSession> {
    const response = await apiClient.delete<ChatSession>(`/chats/${sessionId}`);
    return response.data;
}
