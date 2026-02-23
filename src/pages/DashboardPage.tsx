import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ChevronDown, Database, FileText, Loader2, Scale, Trash2, User, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { getGeneralState, streamGeneralMessage } from '../api/agentChat';
import { getDocumentos, getDownloadUrl } from '../api/documentos';
import type { AgentMessage, ContextItem } from '../api/agentChat';
import ReactMarkdown from 'react-markdown';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import './ChatPage.css';
import './DashboardPage.css';

interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
  context?: ContextItem[];
}

function parseMessages(raw: AgentMessage[] | undefined, globalContext?: ContextItem[]): ParsedMessage[] {
  if (!raw || !Array.isArray(raw)) return [];
  const parsed: ParsedMessage[] = raw
    .filter((m) => m.type === 'human' || m.type === 'ai' || m.type === 'assistant')
    .map((m) => ({
      role: m.type === 'human' ? ('user' as const) : ('assistant' as const),
      content:
        typeof m.data?.content === 'string'
          ? m.data.content
          : String(m.data?.content ?? ''),
    }));

  if (globalContext && globalContext.length > 0 && parsed.length > 0) {
    const lastMsg = parsed[parsed.length - 1];
    if (lastMsg.role === 'assistant') {
      lastMsg.context = globalContext;
    }
  }

  return parsed;
}

function getSaludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 18) return 'Buenas tardes';
  return 'Buenas noches';
}


export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((s) => s.token);
  const nombre = user?.nombre?.split(' ')[0] ?? 'Usuario';
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [expandedContextItems, setExpandedContextItems] = useState<Set<number>>(new Set());
  const [currentContext, setCurrentContext] = useState<ContextItem[]>([]);
  const [previewState, setPreviewState] = useState<{ url: string; name: string; page: number } | null>(null);
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatting = messages.length > 0 || sending;

  const toggleContextItem = (idx: number) => {
    setExpandedContextItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleContextPreview = async (sourceFilename: string, pageLabel: string | number, titulo?: string) => {
    const docs = await queryClient.fetchQuery({
      queryKey: ['documentos-all'],
      queryFn: () => getDocumentos({ limit: 500 }),
      staleTime: 5 * 60 * 1000,
    });
    const doc =
      docs.find((d) => d.nombre_archivo === sourceFilename) ??
      (titulo ? docs.find((d) => d.titulo === titulo) : undefined);
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

  const handleClearChat = () => {
    setMessages([]);
    setCurrentContext([]);
    setShowContextPanel(false);
    setExpandedContextItems(new Set());
    setThreadId(crypto.randomUUID());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userContent = input.trim();
    setInput('');
    setSending(true);

    // Add user message + empty assistant placeholder
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userContent },
      { role: 'assistant', content: '' },
    ]);

    try {
      await streamGeneralMessage(userContent, threadId, (token) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      });

      // Re-fetch state to sync with server checkpoint
      const freshState = await getGeneralState(threadId);
      if (freshState.state?.messages) {
        setMessages(parseMessages(freshState.state.messages, freshState.state.context));
        if (freshState.state.context) setCurrentContext(freshState.state.context);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => {
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

  return (
    <div className={`dashboard-page ${chatting ? 'dashboard-page--chatting' : ''}`}>
      {/* Context Panel */}
      {showContextPanel && currentContext.length > 0 && (
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
            {currentContext.map((item, idx) => {
              const isExpanded = expandedContextItems.has(idx);
              return (
                <div className="chat-page__context-item" key={idx}>
                  <div
                    className="chat-page__context-header chat-page__context-header--clickable"
                    onClick={() => toggleContextItem(idx)}
                  >
                    <div className="chat-page__context-header-left">
                      <span className="chat-page__context-score">
                        {item.score.toFixed(4)} relevancia
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
                          item.document.metadata?.page_label as string | number,
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

      {/* Greeting — hidden when chatting */}
      {!chatting && (
        <div className="dashboard-page__hero">
          <h1 className="dashboard-page__greeting">
            {getSaludo()}, {nombre}
          </h1>
          <p className="dashboard-page__subtitle">
            Bienvenido a su escritorio jurídico inteligente.
          </p>
        </div>
      )}

      {/* Messages area — visible when chatting */}
      {chatting && (
        <div className="dashboard-page__messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
              <div className={`chat-msg__avatar chat-msg__avatar--${msg.role}`}>
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
              </div>
            </div>
          ))}


          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar — always visible */}
      <div className="dashboard-page__input-bar">
        <div className="dashboard-page__input-row">
          {chatting && (
            <button
              className="chat-page__header-btn"
              onClick={handleClearChat}
              title="Limpiar chat"
            >
              <Trash2 size={16} />
            </button>
          )}
          <input
            className="dashboard-page__input"
            type="text"
            placeholder="Haz una pregunta a Kantuta AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            className="dashboard-page__send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            title="Enviar"
          >
            {sending ? <Loader2 className="spin" /> : <ArrowUp />}
          </button>
        </div>
        <p className="dashboard-page__disclaimer">
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
    </div>
  );
}
