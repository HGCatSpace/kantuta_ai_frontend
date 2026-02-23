import { useState, useEffect, useRef } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowUp,
    Loader2,
    MessageSquare,
    FileText,
    Scale,
    User,
    X,
    Info,
    Database,
    ChevronDown,
} from 'lucide-react';
import { getAgentState, streamMessage } from '../api/agentChat';
import { getCasoDetail } from '../api/casos';
import { getChatSession } from '../api/chatSessions';
import { getPrompt } from '../api/prompts';
import { getDocumentos, getDownloadUrl } from '../api/documentos';
import type { AgentMessage, ContextItem } from '../api/agentChat';
import type { DocumentoConocimiento } from '../types/documento';
import ReactMarkdown from 'react-markdown';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { useAuthStore } from '../store/authStore';
import './ChatPage.css';

interface ParsedMessage {
    role: 'user' | 'assistant';
    content: string;
    context?: ContextItem[];
}

function parseMessages(raw: AgentMessage[] | undefined, globalContext?: ContextItem[]): ParsedMessage[] {
    if (!raw || !Array.isArray(raw)) return [];

    // Convert to ParsedMessage format
    const parsed: ParsedMessage[] = raw
        .filter((m) => m.type === 'human' || m.type === 'ai' || m.type === 'assistant')
        .map((m) => ({
            role: m.type === 'human' ? 'user' as const : 'assistant' as const,
            content: typeof m.data?.content === 'string' ? m.data.content : String(m.data?.content ?? ''),
        }));

    // If we have global context from the state, attach it to the LAST assistant message
    // This is a heuristic because the backend sends context as a separate key in the state,
    // not embedded in the message metadata (yet).
    if (globalContext && globalContext.length > 0 && parsed.length > 0) {
        const lastMsg = parsed[parsed.length - 1];
        if (lastMsg.role === 'assistant') {
            lastMsg.context = globalContext;
        }
    }

    return parsed;
}

const timeFormatter = new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
});

function formatNow(): string {
    return timeFormatter.format(new Date());
}

export default function ChatPage() {
    const { casoId, sessionId } = useParams<{ casoId: string; sessionId: string }>();
    const numericCasoId = Number(casoId);
    const queryClient = useQueryClient();
    const token = useAuthStore((s) => s.token);

    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [localMessages, setLocalMessages] = useState<ParsedMessage[]>([]);
    const [showDocsPanel, setShowDocsPanel] = useState(false);
    const [showContextPanel, setShowContextPanel] = useState(false);
    const [showPromptInfo, setShowPromptInfo] = useState(false);
    const [expandedContextItems, setExpandedContextItems] = useState<Set<number>>(new Set());
    const [previewState, setPreviewState] = useState<{ url: string; name: string; page: number } | null>(null);

    const toggleContextItem = (idx: number) => {
        setExpandedContextItems((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleContextPreview = async (sourceFilename: string, pageLabel: string | number, titulo?: string) => {
        const doc =
            allDocs.find((d) => d.nombre_archivo === sourceFilename) ??
            (titulo ? allDocs.find((d) => d.titulo === titulo) : undefined);
        if (!doc) return;
        const page = parseInt(String(pageLabel), 10) || 1;
        try {
            const url = getDownloadUrl(doc.id_documento);
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return;
            const blob = await res.blob();
            setPreviewState({ url: URL.createObjectURL(blob), name: doc.titulo, page });
        } catch {
            // silent
        }
    };

    const closePreview = () => {
        if (previewState) URL.revokeObjectURL(previewState.url);
        setPreviewState(null);
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(0);

    // Fetch case info
    const { data: caso } = useQuery({
        queryKey: ['caso-detail', numericCasoId],
        queryFn: () => getCasoDetail(numericCasoId),
        enabled: !isNaN(numericCasoId),
    });

    // Fetch chat state (message history)
    const { data: agentState, isLoading, isError } = useQuery({
        queryKey: ['agent-state', sessionId],
        queryFn: () => getAgentState(sessionId!),
        enabled: !!sessionId,
    });

    // Fetch chat session metadata (to get system_prompt_id)
    const { data: chatSession } = useQuery({
        queryKey: ['chat-session', sessionId],
        queryFn: () => getChatSession(sessionId!),
        enabled: !!sessionId,
    });

    // Fetch prompt details (includes documentos_conocimiento IDs)
    const { data: prompt } = useQuery({
        queryKey: ['prompt', chatSession?.system_prompt_id],
        queryFn: () => getPrompt(chatSession!.system_prompt_id!),
        enabled: !!chatSession?.system_prompt_id,
    });

    // Fetch all documents — only when showDocsPanel is open (for the linked docs list)
    const { data: allDocs = [] } = useQuery({
        queryKey: ['documentos-all'],
        queryFn: () => getDocumentos({ limit: 500 }),
        enabled: showDocsPanel,
    });

    const linkedDocs: DocumentoConocimiento[] = prompt?.documentos_conocimiento?.length
        ? allDocs.filter((d) => prompt.documentos_conocimiento.includes(d.id_documento))
        : [];

    // Parse messages from agent state
    useEffect(() => {
        if (agentState?.state?.messages) {
            setLocalMessages(parseMessages(agentState.state.messages, agentState.state.context));
        } else if (agentState?.status === 'empty') {
            setLocalMessages([]);
        }
    }, [agentState]);

    // Auto-scroll only when a new message is added, not on every streaming token
    useEffect(() => {
        if (localMessages.length !== prevMessageCountRef.current) {
            prevMessageCountRef.current = localMessages.length;
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [localMessages]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId || sending) return;

        const userContent = input.trim();
        setInput('');
        setSending(true);

        // Optimistic update — add user message + empty assistant placeholder
        setLocalMessages((prev) => [
            ...prev,
            { role: 'user', content: userContent },
            { role: 'assistant', content: '' },
        ]);

        try {
            await streamMessage(
                sessionId,
                userContent,
                (token) => {
                    setLocalMessages((prev) => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last && last.role === 'assistant') {
                            updated[updated.length - 1] = { ...last, content: last.content + token };
                        }
                        return updated;
                    });
                },
                prompt
            );

            // Re-fetch state to sync with server checkpoint
            const freshState = await getAgentState(sessionId);

            // Explicitly update local messages with the fresh state AND context
            if (freshState.state?.messages) {
                setLocalMessages(parseMessages(freshState.state.messages, freshState.state.context));
            }

            queryClient.invalidateQueries({ queryKey: ['chats-by-caso', numericCasoId] });
        } catch (err) {
            console.error('Error sending message:', err);
            setLocalMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant' && !last.content) {
                    updated[updated.length - 1] = {
                        ...last,
                        content: 'Error al procesar tu mensaje. Intenta nuevamente.',
                    };
                } else {
                    updated.push({
                        role: 'assistant',
                        content: 'Error al procesar tu mensaje. Intenta nuevamente.',
                    });
                }
                return updated;
            });
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (isLoading) {
        return (
            <div className="chat-page">
                <div className="chat-page__status">
                    <Loader2 className="spin" /> Cargando historial...
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="chat-page">
                <div className="chat-page__status chat-page__status--error">
                    Error al cargar el chat. Verifica tu conexión.
                </div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            {/* Header */}
            <div className="chat-page__header">
                <div className="chat-page__header-left">
                    <h1 className="chat-page__title">
                        {caso?.titulo ?? 'Chat'}
                    </h1>
                    <div className="chat-page__subtitle">
                        <span className="chat-page__status-dot" />
                        Sesión Activa
                        {caso && (
                            <>
                                {' • '}
                                <NavLink
                                    to={`/casos/${casoId}`}
                                    style={{ color: 'inherit', textDecoration: 'underline' }}
                                >
                                    {caso.titulo}
                                </NavLink>
                            </>
                        )}
                    </div>
                </div>
                <div className="chat-page__header-actions">
                    <button
                        className={`chat-page__header-btn ${showPromptInfo ? 'chat-page__header-btn--active' : ''}`}
                        title="Ver detalles del prompt"
                        onClick={() => setShowPromptInfo(true)}
                        disabled={!prompt}
                    >
                        <Info />
                    </button>
                    <button
                        className={`chat-page__header-btn ${showDocsPanel ? 'chat-page__header-btn--active' : ''}`}
                        title="Ver documentos del prompt"
                        onClick={() => setShowDocsPanel((v) => !v)}
                        disabled={!prompt?.documentos_conocimiento?.length}
                    >
                        <FileText />
                        {prompt?.documentos_conocimiento?.length ? (
                            <span className="chat-page__header-btn-badge">
                                {prompt.documentos_conocimiento.length}
                            </span>
                        ) : null}
                    </button>
                </div>
            </div>

            {/* Documents panel */}
            {showDocsPanel && (
                <div className="chat-page__docs-panel">
                    <div className="chat-page__docs-panel-header">
                        <h3 className="chat-page__docs-panel-title">
                            <FileText size={16} />
                            Documentos del Prompt
                        </h3>
                        <button
                            className="chat-page__docs-panel-close"
                            onClick={() => setShowDocsPanel(false)}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {linkedDocs.length === 0 ? (
                        <div className="chat-page__docs-panel-empty">
                            <Loader2 className="spin" size={16} />
                            Cargando documentos...
                        </div>
                    ) : (
                        <div className="chat-page__docs-panel-list">
                            {linkedDocs.map((doc) => (
                                <div className="chat-page__docs-panel-item" key={doc.id_documento}>
                                    <FileText size={14} />
                                    <div className="chat-page__docs-panel-item-info">
                                        <span className="chat-page__docs-panel-item-title">{doc.titulo}</span>
                                        {doc.categoria && (
                                            <span className="chat-page__docs-panel-item-cat">{doc.categoria}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Context Panel */}
            {showContextPanel && agentState?.state?.context && (
                <div className="chat-page__docs-panel">
                    <div className="chat-page__docs-panel-header">
                        <h3 className="chat-page__docs-panel-title">
                            <Database size={16} />
                            Contexto Recuperado
                        </h3>
                        <button
                            className="chat-page__docs-panel-close"
                            onClick={() => setShowContextPanel(false)}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="chat-page__context-list">
                        {agentState.state.context.map((item, idx) => {
                            const isExpanded = expandedContextItems.has(idx);
                            return (
                                <div className="chat-page__context-item" key={idx}>
                                    <div
                                        className="chat-page__context-header chat-page__context-header--clickable"
                                        onClick={() => toggleContextItem(idx)}
                                    >
                                        <div className="chat-page__context-header-left">
                                            <span className="chat-page__context-score">
                                                {(item.score).toFixed(4)} relevancia
                                            </span>
                                            {!!item.document.metadata?.page_label && (
                                                <span className="chat-page__context-page">
                                                    Pág. {String(item.document.metadata.page_label)}
                                                </span>
                                            )}
                                        </div>
                                        <ChevronDown
                                            size={14}
                                            className={`chat-page__context-chevron ${isExpanded ? 'chat-page__context-chevron--open' : ''}`}
                                        />
                                    </div>
                                    <div className={`chat-page__context-content ${isExpanded ? 'chat-page__context-content--expanded' : ''}`}>
                                        {item.document.page_content}
                                    </div>
                                    <div className="chat-page__context-footer">
                                        <FileText size={12} />
                                        <span>{String(item.document.metadata?.source_filename || 'Desconocido')}</span>
                                        {!!item.document.metadata?.source_filename && (
                                            <button
                                                className="chat-msg__citation-btn"
                                                style={{ marginLeft: 'auto' }}
                                                onClick={() => handleContextPreview(
                                                    item.document.metadata?.source_filename as string,
                                                    (item.document.metadata?.page as number ?? 0) + 1,
                                                    item.document.metadata?.titulo as string,
                                                )}
                                                title="Abrir en documento"
                                            >
                                                <Database size={11} />
                                                Ver pág. {String(item.document.metadata?.page_label ?? '?')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Messages area */}
            <div className="chat-page__messages">
                {localMessages.length === 0 && !sending ? (
                    <div className="chat-page__empty">
                        <MessageSquare />
                        <span className="chat-page__empty-text">Inicia la conversación</span>
                        <span className="chat-page__empty-sub">
                            Escribe un mensaje para comenzar a interactuar con Kantuta AI.
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="chat-page__date-separator">
                            {new Date().toLocaleDateString('es-BO', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </div>

                        {localMessages.map((msg, i) => (
                            <div
                                key={i}
                                className={`chat-msg chat-msg--${msg.role}`}
                            >
                                <div
                                    className={`chat-msg__avatar chat-msg__avatar--${msg.role}`}
                                >
                                    {msg.role === 'user' ? <User /> : <Scale />}
                                </div>
                                <div className="chat-msg__content">
                                    <span className="chat-msg__sender">
                                        {msg.role === 'user' ? 'Tú' : 'Kantuta AI'}
                                    </span>
                                    <div className="chat-msg__bubble">
                                        {msg.role === 'assistant' ? (
                                            msg.content ? (
                                                <>
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                    {msg.context && msg.context.length > 0 && (
                                                        <div className="chat-msg__actions">
                                                            {msg.context.map((ctx, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    className="chat-msg__citation-btn"
                                                                    onClick={() => setShowContextPanel(true)}
                                                                    title={ctx.document.metadata?.source_filename as string}
                                                                >
                                                                    <Database size={12} />
                                                                    {ctx.document.metadata?.titulo
                                                                        ? `${ctx.document.metadata.titulo}, Pág. ${ctx.document.metadata.page_label}`
                                                                        : `Fuente ${idx + 1}`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="chat-msg__typing">
                                                    <span className="chat-msg__typing-dot" />
                                                    <span className="chat-msg__typing-dot" />
                                                    <span className="chat-msg__typing-dot" />
                                                </div>
                                            )
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                    <span className="chat-msg__time">
                                        {msg.role === 'user' ? `Tú • ${formatNow()}` : formatNow()}
                                    </span>
                                </div>
                            </div>
                        ))}


                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="chat-page__input-bar">
                <div className="chat-page__input-row">
                    {/* <button className="chat-page__input-attach" title="Adjuntar">
                        <PlusCircle />
                    </button> */}
                    <input
                        className="chat-page__input"
                        type="text"
                        placeholder="Haz una pregunta de seguimiento..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sending}
                    />
                    <button
                        className="chat-page__send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        title="Enviar"
                    >
                        {sending ? <Loader2 className="spin" /> : <ArrowUp />}
                    </button>
                </div>
                <p className="chat-page__disclaimer">
                    Kantuta AI puede cometer errores. Verifique la información importante.
                </p>
            </div>


            {/* Document Preview Modal (citation click) */}
            {previewState && (
                <DocumentPreviewModal
                    fileUrl={previewState.url}
                    fileName={previewState.name}
                    initialPage={previewState.page}
                    onClose={closePreview}
                />
            )}

            {/* Prompt Details Modal */}
            {
                showPromptInfo && prompt && (
                    <div className="chat-page__modal-overlay" onClick={() => setShowPromptInfo(false)}>
                        <div className="chat-page__modal" onClick={(e) => e.stopPropagation()}>
                            <div className="chat-page__modal-header">
                                <h2 className="chat-page__modal-title">Detalles del System Prompt</h2>
                                <button className="chat-page__modal-close" onClick={() => setShowPromptInfo(false)}>
                                    <X />
                                </button>
                            </div>
                            <div className="chat-page__modal-body">
                                <div className="chat-page__modal-section">
                                    <label>Nombre</label>
                                    <div className="chat-page__modal-value">{prompt.nombre}</div>
                                </div>
                                {prompt.descripcion && (
                                    <div className="chat-page__modal-section">
                                        <label>Descripción</label>
                                        <div className="chat-page__modal-value">{prompt.descripcion}</div>
                                    </div>
                                )}

                                <div className="chat-page__modal-grid">
                                    <div className="chat-page__modal-section">
                                        <label>Temperatura</label>
                                        <div className="chat-page__modal-badge">{prompt.temperatura}</div>
                                    </div>
                                    <div className="chat-page__modal-section">
                                        <label>Top P</label>
                                        <div className="chat-page__modal-badge">{prompt.top_p}</div>
                                    </div>
                                    <div className="chat-page__modal-section">
                                        <label>Top K</label>
                                        <div className="chat-page__modal-badge">{prompt.top_k}</div>
                                    </div>
                                </div>

                                <div className="chat-page__modal-section">
                                    <label>Descripción</label>
                                    <pre className="chat-page__modal-code">{prompt.descripcion}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
