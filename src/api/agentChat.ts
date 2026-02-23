import apiClient from './client';
import type { SystemPrompt } from '../types/prompt';

export interface ContextItem {
    document: {
        page_content: string;
        metadata: Record<string, unknown>;
    };
    score: number;
}

export interface AgentStateResponse {
    session_id: string;
    status?: string;
    message?: string;
    created_at?: string;
    next_step?: string[];
    state: {
        messages?: AgentMessage[];
        context?: ContextItem[];
        [key: string]: unknown;
    };
}

export interface AgentMessage {
    type: string; // "human" or "assistant"
    data: {
        content: string;
        [key: string]: unknown;
    };
}

export interface AgentChatResponse {
    response: unknown;
    session_id: string;
}

export async function getAgentState(sessionId: string): Promise<AgentStateResponse> {
    const response = await apiClient.get<AgentStateResponse>(`/chat-agent/${sessionId}/state`);
    return response.data;
}

export async function sendMessage(sessionId: string, content: string): Promise<AgentChatResponse> {
    const response = await apiClient.post<AgentChatResponse>(`/chat-agent/${sessionId}/message`, {
        content,
    });
    return response.data;
}

// --- General-purpose chat (no DB session required) ---

export interface GeneralChatResponse {
    response: unknown;
    thread_id: string;
}

export async function sendGeneralMessage(
    content: string,
    threadId?: string
): Promise<GeneralChatResponse> {
    const params = threadId ? { thread_id: threadId } : {};
    const response = await apiClient.post<GeneralChatResponse>(
        '/chat-agent/general/message',
        { content },
        { params }
    );
    return response.data;
}

export async function getGeneralState(threadId: string): Promise<AgentStateResponse> {
    const response = await apiClient.get<AgentStateResponse>('/chat-agent/general/state', {
        params: { thread_id: threadId },
    });
    return response.data;
}

// --- Streaming helpers (SSE via fetch) ---

const API_BASE = import.meta.env.VITE_API_URL as string;

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Stream tokens from the session-based chat endpoint.
 * Calls `onToken` for each text chunk received.
 */
export async function streamMessage(
    sessionId: string,
    content: string,
    onToken: (token: string) => void,
    system_prompt?: SystemPrompt | Record<string, unknown> | null,
): Promise<void> {
    const res = await fetch(`${API_BASE}/chat-agent/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content, system_prompt }),
    });

    if (!res.ok) {
        throw new Error(`Stream error: ${res.status}`);
    }

    await consumeSSE(res, onToken);
}

/**
 * Stream tokens from the general chat endpoint.
 */
export async function streamGeneralMessage(
    content: string,
    threadId: string,
    onToken: (token: string) => void,
): Promise<void> {
    const url = new URL(`${API_BASE}/chat-agent/general/stream`);
    url.searchParams.set('thread_id', threadId);

    const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content }),
    });

    if (!res.ok) {
        throw new Error(`Stream error: ${res.status}`);
    }

    await consumeSSE(res, onToken);
}

async function consumeSSE(res: Response, onToken: (token: string) => void): Promise<void> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const payload = trimmed.slice(6);
            if (payload === '[DONE]') return;

            try {
                const parsed = JSON.parse(payload);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.token) onToken(parsed.token);
            } catch {
                // skip malformed lines
            }
        }
    }
}

