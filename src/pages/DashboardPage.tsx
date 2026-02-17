import { useState, useEffect, useRef } from 'react';
import { ArrowUp, Loader2, Scale, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getGeneralState, streamGeneralMessage } from '../api/agentChat';
import type { AgentMessage } from '../api/agentChat';
import ReactMarkdown from 'react-markdown';
import './ChatPage.css';
import './DashboardPage.css';

interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
}

function parseMessages(raw: AgentMessage[] | undefined): ParsedMessage[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((m) => m.type === 'human' || m.type === 'ai' || m.type === 'assistant')
    .map((m) => ({
      role: m.type === 'human' ? ('user' as const) : ('assistant' as const),
      content:
        typeof m.data?.content === 'string'
          ? m.data.content
          : String(m.data?.content ?? ''),
    }));
}

function getSaludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function generateThreadId(): string {
  return crypto.randomUUID();
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const nombre = user?.nombre?.split(' ')[0] ?? 'Usuario';

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [threadId] = useState<string>(() => {
    const stored = sessionStorage.getItem('dashboard_thread_id');
    if (stored) return stored;
    const id = generateThreadId();
    sessionStorage.setItem('dashboard_thread_id', id);
    return id;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatting = messages.length > 0 || sending;

  // Restore messages from existing thread on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await getGeneralState(threadId);
        if (!cancelled && state.state?.messages) {
          setMessages(parseMessages(state.state.messages));
        }
      } catch {
        // No prior state — fresh thread
      }
    })();
    return () => { cancelled = true; };
  }, [threadId]);

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
        setMessages(parseMessages(freshState.state.messages));
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
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
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
    </div>
  );
}
