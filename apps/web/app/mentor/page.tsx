'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerConfetti } from '../../lib/utils/confetti';
import { clearToken, getToken } from '../../lib/api/auth';
import {
  createConversation,
  deleteConversation,
  getConversationDetail,
  getConversations,
  regenerateMessage,
  sendStreamingMessage,
} from '../../lib/api/chat';
import type { Conversation, Message } from '../../lib/types/chat';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { Button, ContentCallout } from '@techseeker/ui';

const SUGGESTIONS = [
  {
    title: 'Explain JavaScript Closures',
    prompt: 'Explain closures with a practical real-world example and common pitfalls.',
    icon: '⚡',
  },
  {
    title: 'Debug Code & Edge Cases',
    prompt: 'Help me debug this error and identify unhandled edge cases in my implementation.',
    icon: '🔍',
  },
  {
    title: 'React Server Components Internals',
    prompt: 'How do React Server Components work under the hood compared to Client Components?',
    icon: '⚛️',
  },
  {
    title: '30-Day DSA Mastery Plan',
    prompt: 'Create a structured 30-day DSA learning strategy focusing on core patterns.',
    icon: '🗺️',
  },
  {
    title: 'Database Indexing & B-Trees',
    prompt: 'Explain how database B-Tree indexing works and how to optimize slow queries.',
    icon: '🗄️',
  },
  {
    title: 'Async/Await vs Promises',
    prompt: 'Break down how JavaScript async/await executes in the event loop compared to Promises.',
    icon: '🔄',
  },
];

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('credentials') ||
    message.includes('unauthorized') ||
    message.includes('not authenticated')
  );
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function TrashIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

export default function MentorPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [threadsDrawerOpen, setThreadsDrawerOpen] = useState(false);
  const hasTriggeredFirstConfetti = useRef(false);

  // Deletion Modal State
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);

  const activeConversationIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Toast timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Sync ref with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Load conversation list on mount
  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const authToken = token;

    async function loadConversations() {
      try {
        const data = await getConversations(authToken);
        setConversations(data);

        if (data.length > 0) {
          setActiveConversationId(data[0].id);
        }
      } catch (error) {
        if (isAuthError(error)) {
          clearToken();
          router.replace('/login' as Route);
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : 'Failed to load conversations',
        );
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConversations();
  }, [router]);

  // Load message detail when active conversation changes
  useEffect(() => {
    if (activeConversationId === null) {
      setMessages([]);
      return;
    }

    const conversationId = activeConversationId;
    const token = getToken();

    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function loadConversationDetail() {
      setLoadingMessages(true);
      setMessages([]);
      setLoadError(null);

      try {
        const detail = await getConversationDetail(authToken, conversationId);
        if (cancelled) return;
        setMessages(detail.messages);
      } catch (error) {
        if (cancelled) return;
        if (isAuthError(error)) {
          clearToken();
          router.replace('/login' as Route);
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : 'Failed to load conversation messages',
        );
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadConversationDetail();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, router]);

  // Auto-scroll on new message chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingMessage, isRegenerating]);

  async function startNewConversation() {
    if (creatingConversation) return;

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    setCreatingConversation(true);
    setLoadError(null);

    try {
      const newConversation = await createConversation(token);
      setConversations((current) => [newConversation, ...current]);
      setActiveConversationId(newConversation.id);
      setMessage('');
      textareaRef.current?.focus();
    } catch (error) {
      if (isAuthError(error)) {
        clearToken();
        router.replace('/login' as Route);
        return;
      }

      setLoadError(
        error instanceof Error ? error.message : 'Failed to create conversation',
      );
    } finally {
      setCreatingConversation(false);
    }
  }

  function selectConversation(conversationId: number) {
    if (conversationId === activeConversationId) return;
    setActiveConversationId(conversationId);
    setMessage('');
    setThreadsDrawerOpen(false);
    textareaRef.current?.focus();
  }

  // Handle Conversation Deletion with Confirmation & Optimistic Rollback
  async function confirmDeleteConversation() {
    if (!conversationToDelete || isDeleting) return;

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const targetId = conversationToDelete.id;
    const previousConversations = [...conversations];
    const updatedConversations = conversations.filter((c) => c.id !== targetId);

    setIsDeleting(true);
    // Optimistic UI update
    setConversations(updatedConversations);

    // Switch active conversation if the deleted one was active
    if (activeConversationId === targetId) {
      if (updatedConversations.length > 0) {
        setActiveConversationId(updatedConversations[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }

    setConversationToDelete(null);

    try {
      await deleteConversation(token, targetId);
      setToastMessage({ text: 'Conversation deleted successfully.', variant: 'success' });
    } catch (err) {
      // Rollback on failure
      setConversations(previousConversations);
      if (activeConversationId === targetId || activeConversationId === null) {
        setActiveConversationId(targetId);
      }
      setToastMessage({
        text: err instanceof Error ? err.message : 'Failed to delete conversation.',
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendMessage() {
    const trimmed = message.trim();
    if (
      !trimmed ||
      activeConversationId === null ||
      sendingMessage ||
      loadingMessages ||
      isRegenerating
    ) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const conversationId = activeConversationId;
    const wasNewChat =
      conversations.find((c) => c.id === conversationId)?.title === 'New Chat';

    const userMsgId = Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = userMsgId + 1;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setMessage('');
    setSendingMessage(true);
    setLoadError(null);

    try {
      await sendStreamingMessage(token, conversationId, trimmed, {
        onChunk: (chunk: string) => {
          if (activeConversationIdRef.current !== conversationId) return;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
        onComplete: async () => {
          setSendingMessage(false);
          // Celebrate first AI response in this session
          if (!hasTriggeredFirstConfetti.current) {
            hasTriggeredFirstConfetti.current = true;
            triggerConfetti();
          }
          if (wasNewChat) {
            const updated = await getConversations(token);
            if (activeConversationIdRef.current === conversationId) {
              setConversations(updated);
            }
          }
        },
        onError: (error: Error) => {
          if (isAuthError(error)) {
            clearToken();
            router.replace('/login' as Route);
            return;
          }
          setLoadError(
            error instanceof Error ? error.message : 'Failed to stream response',
          );
          setSendingMessage(false);
        },
      });
    } catch {
      setSendingMessage(false);
    }
  }

  async function handleRegenerate(assistantMessageId: number) {
    if (
      activeConversationId === null ||
      sendingMessage ||
      isRegenerating ||
      loadingMessages
    ) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    setIsRegenerating(true);
    setLoadError(null);

    const previousContent = messages.find((m) => m.id === assistantMessageId)?.content;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId ? { ...msg, content: '' } : msg,
      ),
    );

    try {
      const regeneratedMsg = await regenerateMessage(token, assistantMessageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? regeneratedMsg : msg,
        ),
      );
    } catch (error) {
      if (isAuthError(error)) {
        clearToken();
        router.replace('/login' as Route);
        return;
      }
      setLoadError(
        error instanceof Error ? error.message : 'Failed to regenerate response',
      );
      if (previousContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: previousContent } : msg,
          ),
        );
      }
    } finally {
      setIsRegenerating(false);
    }
  }

  function handleCopyResponse(msgId: number, content: string) {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId((current) => (current === msgId ? null : current));
    }, 2000);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!sendingMessage && !isRegenerating) {
        handleSendMessage();
      }
    }
  }

  function handleSuggestionClick(promptText: string) {
    setMessage(promptText);
    textareaRef.current?.focus();
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeTitle = activeConversation?.title || (loadingConversations ? 'Loading...' : 'AI Mentor');

  const latestAssistantMessageId = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')?.id;

  // Sidebar thread list content
  const sidebarContent = (
    <div className="flex h-full flex-col justify-between select-none">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between px-3 py-3.5 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-brand font-bold text-xs border border-brand-border">
                ⚡
              </span>
              <h2 className="text-xs font-bold text-content-primary tracking-tight uppercase">
                AI Mentor Workspace
              </h2>
            </div>
            <p className="text-[10px] text-content-muted mt-0.5">
              Technical pair programming & guidance
            </p>
          </div>

          <button
            type="button"
            onClick={() => setThreadsDrawerOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-content-muted hover:text-content-primary lg:hidden"
            aria-label="Close threads panel"
          >
            ✕
          </button>
        </div>

        {/* Action Button */}
        <div className="p-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              startNewConversation();
              setThreadsDrawerOpen(false);
            }}
            disabled={creatingConversation}
            isLoading={creatingConversation}
            className="w-full justify-center text-xs font-semibold shadow-subtle"
          >
            + New Chat
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-content-muted">
            <span>Conversations</span>
            <span className="font-mono text-[9px]">{conversations.length}</span>
          </div>

          {loadingConversations ? (
            <div className="space-y-1.5 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 w-full animate-pulse rounded-lg bg-surface-elevated"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-content-muted">No conversations yet.</p>
              <p className="text-[10px] text-content-muted mt-1">
                Start a new chat to begin pairing.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const formatted = conv.created_at ? formatDate(conv.created_at) : '';

              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-subtle text-brand font-semibold shadow-subtle border-l-2 border-brand pl-2'
                      : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(conv.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                  >
                    <span
                      className={`font-mono text-[11px] shrink-0 ${
                        isActive ? 'text-brand' : 'text-content-muted'
                      }`}
                    >
                      #
                    </span>
                    <span className="truncate flex-1">{conv.title}</span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {formatted && (
                      <span className="text-[9px] font-mono text-content-muted group-hover:hidden sm:group-hover:inline">
                        {formatted}
                      </span>
                    )}

                    {/* Delete Conversation Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv);
                      }}
                      className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-content-muted hover:bg-rose-500/10 hover:text-rose-500 transition press-scale focus:opacity-100"
                      title="Delete conversation"
                      aria-label={`Delete ${conv.title}`}
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Adaptive Context Summary Footer */}
      <div className="shrink-0 border-t border-border-subtle p-3 bg-surface">
        <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-content-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
            <span>Adaptive Intelligence</span>
          </div>
          <p className="text-[10px] text-content-muted mt-1 leading-relaxed">
            Mentoring tuned to your active roadmap, weak areas, and progress.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100vh-theme(spacing.12))] md:h-screen w-full overflow-hidden bg-canvas text-content-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-pop-up">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium shadow-elevated border ${
              toastMessage.variant === 'success'
                ? 'border-emerald-500/30 bg-emerald-950 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950 text-rose-300'
            }`}
          >
            <span>{toastMessage.variant === 'success' ? '✓' : '⚠️'}</span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Conversation Deletion */}
      {conversationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeleting && setConversationToDelete(null)}
          />

          {/* Modal Box */}
          <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-6 shadow-elevated z-10 animate-pop-up">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-sm font-bold text-content-primary">
                  Delete Conversation?
                </h3>
                <p className="text-xs text-content-muted mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-content-secondary leading-relaxed bg-surface-elevated p-3 rounded-lg border border-border-subtle">
              Are you sure you want to permanently delete{' '}
              <strong className="text-content-primary font-semibold">
                &ldquo;{conversationToDelete.title}&rdquo;
              </strong>{' '}
              and its entire message history?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConversationToDelete(null)}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDeleteConversation}
                disabled={isDeleting}
                isLoading={isDeleting}
                className="text-xs font-semibold"
              >
                Delete Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Conversation Sidebar */}
      <aside className="relative z-20 hidden w-72 shrink-0 border-r border-border-subtle bg-surface lg:flex lg:flex-col min-h-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {threadsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setThreadsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border-subtle bg-surface shadow-elevated z-10 animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="relative z-10 flex h-full flex-1 flex-col min-w-0 overflow-hidden bg-canvas">
        {/* Workspace Header */}
        <header className="shrink-0 flex items-center justify-between border-b border-border-subtle px-4 py-2.5 sm:px-6 bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setThreadsDrawerOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-2.5 text-xs font-medium text-content-secondary hover:bg-surface-hover hover:text-content-primary lg:hidden"
              aria-label="Open threads drawer"
            >
              <span>#</span>
              <span>Threads</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-content-primary tracking-tight truncate">
                  {activeTitle}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-elevated px-2 py-0.5 text-[9px] font-medium text-content-secondary">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      sendingMessage
                        ? 'bg-status-info animate-pulse'
                        : isRegenerating
                        ? 'bg-accent-violet animate-pulse'
                        : 'bg-status-success'
                    }`}
                  />
                  {sendingMessage
                    ? 'Streaming response...'
                    : isRegenerating
                    ? 'Regenerating...'
                    : loadingMessages
                    ? 'Loading...'
                    : 'Ready'}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-elevated px-2 py-0.5 text-[9px] font-medium text-content-muted">
                  <span className="text-brand">✦</span> Adaptive Context Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              disabled={creatingConversation}
              isLoading={creatingConversation}
              className="text-xs font-medium"
            >
              + New Chat
            </Button>
          </div>
        </header>

        {/* Scrollable Message Area */}
        <section className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            {loadError && (
              <ContentCallout variant="danger" title="Mentor Communication Notice">
                {loadError}
              </ContentCallout>
            )}

            {loadingMessages ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-3" />
                <p className="text-xs text-content-muted">Loading conversation history...</p>
              </div>
            ) : messages.length === 0 ? (
              /* Empty State Hero */
              <div className="py-8 sm:py-12 text-center max-w-2xl mx-auto">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-xl text-brand border border-brand-border shadow-subtle">
                  ⚡
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                  TechSeeker Intelligence
                </p>

                <h2 className="mt-1.5 text-xl font-bold text-content-primary sm:text-2xl tracking-tight">
                  AI Mentor & Technical Workspace
                </h2>

                <p className="mt-2 text-xs text-content-secondary leading-relaxed max-w-lg mx-auto">
                  Your technical thinking partner. Ask questions about system architecture,
                  debug code, practice concepts, or receive tailored roadmap guidance.
                </p>

                {/* Developer Suggestion Prompts */}
                <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2 text-left">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => handleSuggestionClick(item.prompt)}
                      className="group rounded-xl border border-border-subtle bg-surface p-3 text-left interactive-lift hover:border-brand-border hover:bg-surface-hover hover:shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm select-none">{item.icon}</span>
                        <h3 className="text-xs font-semibold text-content-primary group-hover:text-brand transition">
                          {item.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-[11px] text-content-muted line-clamp-2 leading-normal">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Stream */
              <div className="flex flex-col gap-6 pb-4">
                <AnimatePresence initial={false}>
                  {messages.map((chatMessage) => {
                    const isAssistant = chatMessage.role === 'assistant';
                    const isLatestAssistant =
                      isAssistant && chatMessage.id === latestAssistantMessageId;
                    const isCopied = copiedMessageId === chatMessage.id;

                    return (
                      <motion.div
                        key={chatMessage.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col ${
                          isAssistant ? 'items-start' : 'items-end'
                        }`}
                      >
                        {/* User Bubble */}
                        {!isAssistant ? (
                          <div className="flex flex-col items-end max-w-[88%] sm:max-w-[78%]">
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                              <span>You</span>
                            </div>
                            <div className="rounded-2xl rounded-tr-sm border border-border bg-surface-elevated px-4 py-3 text-sm leading-relaxed text-content-primary shadow-subtle whitespace-pre-wrap">
                              {chatMessage.content}
                            </div>
                          </div>
                        ) : (
                          /* Assistant Bubble */
                          <div className="w-full max-w-full sm:max-w-[95%]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-cyan-500 text-[10px] font-bold text-slate-950 shadow-subtle shrink-0">
                                TS
                              </div>
                              <span className="text-xs font-bold text-content-primary tracking-tight">
                                AI Mentor
                              </span>
                              {sendingMessage && !chatMessage.content && isLatestAssistant && (
                                <span className="flex items-center gap-1.5 text-[10px] text-brand font-medium animate-pulse">
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                  Thinking & structuring response...
                                </span>
                              )}
                            </div>

                            <div className="rounded-2xl rounded-tl-sm border border-border-subtle bg-surface p-4 sm:p-5 text-sm leading-relaxed shadow-subtle">
                              {chatMessage.content ? (
                                <MarkdownRenderer content={chatMessage.content} />
                              ) : (
                                (sendingMessage && isLatestAssistant) ||
                                (isRegenerating && isLatestAssistant) ? (
                                  <div className="flex items-center gap-2 py-2 text-xs text-content-muted">
                                    <span className="h-2 w-2 animate-ping rounded-full bg-brand" />
                                    <span className="italic">
                                      {isRegenerating
                                        ? 'Regenerating technical explanation...'
                                        : 'Analyzing and generating response...'}
                                    </span>
                                  </div>
                                ) : null
                              )}
                            </div>

                            {/* Assistant Action Bar */}
                            {chatMessage.content && !sendingMessage && (
                              <div className="mt-2 flex items-center gap-2">
                                {/* Copy Response Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyResponse(chatMessage.id, chatMessage.content)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-medium text-content-secondary transition hover:bg-surface-hover hover:text-content-primary press-scale"
                                  aria-label="Copy full response"
                                >
                                  <span>{isCopied ? '✓' : '⎘'}</span>
                                  <span>{isCopied ? 'Copied' : 'Copy Response'}</span>
                                </button>

                                {/* Regenerate Button (Only under latest assistant response) */}
                                {isLatestAssistant && (
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerate(chatMessage.id)}
                                    disabled={isRegenerating || sendingMessage}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-medium text-content-secondary transition hover:border-brand-border hover:bg-brand-subtle hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Regenerate assistant response"
                                  >
                                    <span
                                      className={`text-xs ${
                                        isRegenerating ? 'animate-spin' : ''
                                      }`}
                                    >
                                      ↺
                                    </span>
                                    <span>
                                      {isRegenerating
                                        ? 'Regenerating...'
                                        : 'Regenerate'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </section>

        {/* Pinned Bottom Composer */}
        <div className="shrink-0 border-t border-border-subtle bg-surface/90 p-3 sm:p-4 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
            <div className="relative rounded-xl border border-border bg-surface shadow-elevated glow-on-hover transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand focus-within:shadow-[var(--shadow-glow)]">
              <div className="flex items-end gap-2 p-2.5">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    sendingMessage || isRegenerating
                      ? 'Mentor is streaming response...'
                      : 'Ask your AI mentor anything... (Shift+Enter for newline)'
                  }
                  rows={1}
                  disabled={sendingMessage || isRegenerating || loadingMessages}
                  className="max-h-36 min-h-[42px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-content-primary outline-none placeholder:text-content-muted disabled:opacity-60"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !message.trim() ||
                    sendingMessage ||
                    isRegenerating ||
                    loadingMessages ||
                    activeConversationId === null
                  }
                  isLoading={sendingMessage || isRegenerating}
                  className="mb-0.5 shrink-0 px-3.5"
                >
                  Send
                </Button>
              </div>

              <div className="flex items-center justify-between border-t border-border-subtle px-3 py-1.5 text-[10px] text-content-muted">
                <span>TechSeeker Adaptive Intelligence • Verify critical code</span>
                <span className="hidden sm:inline">Enter ↵ to send • Shift + Enter for newline</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}