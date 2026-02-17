import apiClient from './client';

export interface ChunkResult {
    content: string;
    score: number;
    metadata: Record<string, unknown>;
}

export interface SearchResponse {
    query: string;
    results: ChunkResult[];
}

export interface SourcesResponse {
    sources: string[];
}

export async function searchKnowledgeBase(
    query: string,
    k = 5,
    sourceFilename?: string
): Promise<SearchResponse> {
    const response = await apiClient.post<SearchResponse>('/knowledge/search', {
        query,
        k,
        ...(sourceFilename ? { source_filename: sourceFilename } : {}),
    });
    return response.data;
}

export async function getKnowledgeSources(): Promise<string[]> {
    const response = await apiClient.get<SourcesResponse>('/knowledge/sources');
    return response.data.sources;
}
