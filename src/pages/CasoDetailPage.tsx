import { useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2, Loader2, Clock, Plus, X } from 'lucide-react';
import { getCasoDetail } from '../api/casos';
import { getChatsByCaso, archiveChat, createChatSession } from '../api/chatSessions';
import { getActiveSystemPrompts } from '../api/systemPrompts';
import type { ChatSession } from '../types/chatSession';
import './CasoDetailPage.css';
import ConfirmDialog from '../components/ConfirmDialog';

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
});

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
        if (isToday) return 'Hoy';

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday =
            d.getDate() === yesterday.getDate() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getFullYear() === yesterday.getFullYear();
        if (isYesterday) return 'Ayer';

        return dateFormatter.format(d);
    } catch {
        return iso;
    }
}

function formatTime(iso: string): string {
    try {
        return timeFormatter.format(new Date(iso));
    } catch {
        return '';
    }
}

function formatFullDate(iso: string): string {
    const datePart = formatDate(iso);
    const timePart = formatTime(iso);
    return `${datePart}, ${timePart}`;
}

function timeSince(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'ahora mismo';
        if (mins < 60) return `hace ${mins} min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `hace ${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `hace ${days}d`;
    } catch {
        return '';
    }
}

export default function CasoDetailPage() {
    const { id } = useParams<{ id: string }>();
    const casoId = Number(id);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // ─── Modal state ───
    const [showModal, setShowModal] = useState(false);
    const [newChatTitulo, setNewChatTitulo] = useState('');
    const [newChatPromptId, setNewChatPromptId] = useState<number | ''>('');
    const [confirmArchive, setConfirmArchive] = useState<ChatSession | null>(null);

    const {
        data: caso,
        isLoading: casoLoading,
        isError: casoError,
    } = useQuery({
        queryKey: ['caso-detail', casoId],
        queryFn: () => getCasoDetail(casoId),
        enabled: !isNaN(casoId),
    });

    const {
        data: chats = [],
        isLoading: chatsLoading,
        isError: chatsError,
    } = useQuery({
        queryKey: ['chats-by-caso', casoId],
        queryFn: () => getChatsByCaso(casoId),
        enabled: !isNaN(casoId),
    });

    // Fetch system prompts for the dropdown (only when modal is open)
    const { data: systemPrompts = [] } = useQuery({
        queryKey: ['system-prompts-active'],
        queryFn: getActiveSystemPrompts,
        enabled: showModal,
    });

    const archiveMutation = useMutation({
        mutationFn: (sessionId: string) => archiveChat(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats-by-caso', casoId] });
        },
    });

    const createChatMutation = useMutation({
        mutationFn: (payload: { titulo: string; caso_id: number; system_prompt_id: number }) =>
            createChatSession(payload),
        onSuccess: (newChat) => {
            queryClient.invalidateQueries({ queryKey: ['chats-by-caso', casoId] });
            setShowModal(false);
            navigate(`/casos/${casoId}/chat/${newChat.id_session}`);
        },
    });

    const handleOpenModal = () => {
        setNewChatTitulo('');
        setNewChatPromptId('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (createChatMutation.isPending) return;
        setShowModal(false);
    };

    const handleCreateChat = () => {
        if (!newChatTitulo.trim() || newChatPromptId === '') return;
        createChatMutation.mutate({
            titulo: newChatTitulo.trim(),
            caso_id: casoId,
            system_prompt_id: Number(newChatPromptId),
        });
    };

    const handleArchiveChat = (chat: ChatSession) => {
        setConfirmArchive(chat);
    };

    const handleConfirmArchive = () => {
        if (!confirmArchive) return;
        archiveMutation.mutate(confirmArchive.id_session, {
            onSuccess: () => setConfirmArchive(null),
        });
    };

    const handleOpenChat = (sessionId: string) => {
        navigate(`/casos/${casoId}/chat/${sessionId}`);
    };

    const isLoading = casoLoading || chatsLoading;
    const isError = casoError || chatsError;

    if (isLoading) {
        return (
            <div className="caso-detail">
                <div className="caso-detail__status">
                    <Loader2 className="spin" /> Cargando caso...
                </div>
            </div>
        );
    }

    if (isError || !caso) {
        return (
            <div className="caso-detail">
                <div className="caso-detail__status caso-detail__status--error">
                    Error al cargar el caso. Verifica tu conexión.
                </div>
            </div>
        );
    }

    const canSubmit = newChatTitulo.trim().length > 0 && newChatPromptId !== '' && !createChatMutation.isPending;

    return (
        <div className="caso-detail">
            {/* Breadcrumb */}
            <div className="caso-detail__breadcrumb">
                <NavLink to="/casos" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Gestión de Casos
                </NavLink>
                {' / '}Detalle
            </div>

            {/* Header */}
            <div className="caso-detail__header">
                <div className="caso-detail__header-left">
                    <h1 className="caso-detail__title">{caso.titulo}</h1>
                    <div className="caso-detail__meta">
                        <span
                            className={`caso-detail__badge caso-detail__badge--${caso.estado.toLowerCase()}`}
                        >
                            {caso.estado}
                        </span>
                        <span className="caso-detail__last-access">
                            <Clock />
                            Último acceso: {formatFullDate(caso.fecha_actualizacion)}
                        </span>
                    </div>
                </div>

                <button
                    className="caso-detail__new-chat-btn"
                    onClick={handleOpenModal}
                >
                    <Plus />
                    Nuevo Chat
                </button>
            </div>

            {/* Info strip */}
            <div className="caso-detail__info-strip">
                <div className="caso-detail__info-item">
                    <span className="caso-detail__info-label">Chats activos</span>
                    <span className="caso-detail__info-value">{chats.length}</span>
                </div>

                {caso.descripcion && (
                    <div className="caso-detail__info-item" style={{ flex: 1 }}>
                        <span className="caso-detail__info-label">Descripción</span>
                        <span className="caso-detail__info-value" style={{ fontWeight: 400 }}>
                            {caso.descripcion}
                        </span>
                    </div>
                )}
            </div>

            {/* Chats table */}
            <table className="caso-detail__table">
                <thead>
                    <tr>
                        <th>Nombre del Chat</th>
                        <th>Último Mensaje</th>
                        <th>Fecha de creación</th>
                        <th style={{ width: '100px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {chats.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="caso-detail__empty">
                                No hay chats activos en este caso.
                            </td>
                        </tr>
                    ) : (
                        chats.map((chat) => (
                            <tr key={chat.id_session} onClick={() => handleOpenChat(chat.id_session)} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div className="caso-detail__chat-name">{chat.titulo}</div>
                                    <div className="caso-detail__chat-initiator">
                                        <MessageSquare />
                                        Sesión de chat
                                    </div>
                                </td>
                                <td>
                                    <div className="caso-detail__chat-date">
                                        {formatDate(chat.ultimo_acceso)}, {formatTime(chat.ultimo_acceso)}
                                    </div>
                                    <div className="caso-detail__chat-time">{timeSince(chat.ultimo_acceso)}</div>
                                </td>
                                <td>
                                    <span className="caso-detail__docs-badge">
                                        {formatDate(chat.fecha_creacion)}
                                    </span>
                                </td>
                                <td>
                                    <div className="caso-detail__actions">
                                        <button
                                            className="caso-detail__action-btn caso-detail__action-btn--chat"
                                            title="Abrir chat"
                                            onClick={(e) => { e.stopPropagation(); handleOpenChat(chat.id_session); }}
                                        >
                                            <MessageSquare />
                                        </button>
                                        <button
                                            className="caso-detail__action-btn caso-detail__action-btn--danger"
                                            title="Archivar chat"
                                            onClick={(e) => { e.stopPropagation(); handleArchiveChat(chat); }}
                                        >
                                            <Trash2 />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* ─── New Chat Modal ─── */}
            {confirmArchive && (
                <ConfirmDialog
                    title="Archivar Chat"
                    message={
                        <>
                            ¿Archivar el chat{' '}
                            <strong>&ldquo;{confirmArchive.titulo}&rdquo;</strong>?
                            El chat quedará inactivo.
                        </>
                    }
                    confirmLabel="Archivar"
                    variant="warning"
                    onConfirm={handleConfirmArchive}
                    onCancel={() => setConfirmArchive(null)}
                    isLoading={archiveMutation.isPending}
                />
            )}

            {showModal && (
                <div className="caso-modal-overlay" onClick={handleCloseModal}>
                    <div className="caso-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="caso-modal__header">
                            <h2 className="caso-modal__title">Nuevo Chat</h2>
                            <button
                                className="caso-modal__close"
                                onClick={handleCloseModal}
                                disabled={createChatMutation.isPending}
                            >
                                <X />
                            </button>
                        </div>

                        <div className="caso-modal__body">
                            <label className="caso-modal__label" htmlFor="new-chat-titulo">
                                Título del Chat
                            </label>
                            <input
                                id="new-chat-titulo"
                                className="caso-modal__input"
                                type="text"
                                placeholder="Ej: Consulta sobre contrato"
                                value={newChatTitulo}
                                onChange={(e) => setNewChatTitulo(e.target.value)}
                                autoFocus
                                disabled={createChatMutation.isPending}
                            />

                            <label className="caso-modal__label" htmlFor="new-chat-prompt">
                                System Prompt
                            </label>
                            <select
                                id="new-chat-prompt"
                                className="caso-modal__select"
                                value={newChatPromptId}
                                onChange={(e) => setNewChatPromptId(e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={createChatMutation.isPending}
                            >
                                <option value="">Seleccionar prompt…</option>
                                {systemPrompts.map((sp) => (
                                    <option key={sp.id_prompt} value={sp.id_prompt}>
                                        {sp.nombre}
                                    </option>
                                ))}
                            </select>

                            {createChatMutation.isError && (
                                <p className="caso-modal__error">
                                    Error al crear el chat. Intenta nuevamente.
                                </p>
                            )}
                        </div>

                        <div className="caso-modal__footer">
                            <button
                                className="caso-modal__btn caso-modal__btn--cancel"
                                onClick={handleCloseModal}
                                disabled={createChatMutation.isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                className="caso-modal__btn caso-modal__btn--submit"
                                onClick={handleCreateChat}
                                disabled={!canSubmit}
                            >
                                {createChatMutation.isPending ? (
                                    <>
                                        <Loader2 className="spin" /> Creando…
                                    </>
                                ) : (
                                    'Crear Chat'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
