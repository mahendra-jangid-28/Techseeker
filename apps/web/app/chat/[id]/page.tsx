'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { clearToken, getToken } from '../../../lib/api/auth';
import {
  getConversationDetail,
  getConversations,
  regenerateMessage,
  sendStreamingMessage,
} from '../../../lib/api/chat';
import type { Message } from '../../../lib/types/chat';
import { MarkdownRenderer } from '../../../components/MarkdownRenderer';
import { Button, ContentCallout } from '@techseeker/ui';

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('credentials') ||
    msg.includes('unauthorized') ||
    msg.includes('not authenticated')
  );
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = Number(params?.id);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState('AI Mentor Chat');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  // User Message Editing State
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const assistantMsgIdRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll on new messages / chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, isRegenerating]);

  // Focus edit textarea when entering edit mode
  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length
      );
    }
  }, [editingMessageId]);

  // Load conversation details
  useEffect(() => {
    if (!conversationId || isNaN(conversationId)) return;

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    let cancelled = false;

    async function loadChat() {
      setLoadingMessages(true);
      setErrorMessage(null);

      try {
        const detail = await getConversationDetail(token as string, conversationId);
        if (cancelled) return;

        setMessages(detail.messages);
        if (detail.title) setTitle(detail.title);
      } catch (err) {
        if (cancelled) return;
        if (isAuthError(err)) {
          clearToken();
          router.replace('/login' as Route);
          return;
        }
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to load conversation.',
        );
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadChat();

    return () => {
      cancelled = true;
    };
  }, [conversationId, router]);

  async function handleSend() {
    const trimmed = message.trim();
    if (
      !trimmed ||
      isStreaming ||
      isRegenerating ||
      loadingMessages ||
      !conversationId
    ) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const userMsgId = Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = userMsgId + 1;
    assistantMsgIdRef.current = assistantMsgId;

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setMessage('');
    setIsStreaming(true);
    setErrorMessage(null);

    try {
      await sendStreamingMessage(token, conversationId, trimmed, {
        onChunk: (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
        onComplete: () => {
          setIsStreaming(false);
          getConversations(token)
            .then((convList) => {
              const current = convList.find((c) => c.id === conversationId);
              if (current?.title) setTitle(current.title);
            })
            .catch(() => {});
        },
        onError: (err: Error) => {
          if (isAuthError(err)) {
            clearToken();
            router.replace('/login' as Route);
            return;
          }
          setErrorMessage(err.message);
          setIsStreaming(false);
        },
      });
    } catch {
      setIsStreaming(false);
    }
  }

  // Handle User Message Edit Submission
  async function handleSaveEdit(userMessageId: number) {
    const trimmed = editContent.trim();
    if (
      !trimmed ||
      isStreaming ||
      isRegenerating ||
      !conversationId
    ) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const originalMessages = [...messages];
    const userMsgIndex = messages.findIndex((m) => m.id === userMessageId);
    if (userMsgIndex === -1) return;

    // Prune subsequent messages (e.g. stale assistant reply)
    const updatedMessages = messages.slice(0, userMsgIndex + 1).map((m) =>
      m.id === userMessageId ? { ...m, content: trimmed } : m
    );

    const assistantMsgId = Date.now();
    assistantMsgIdRef.current = assistantMsgId;

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages([...updatedMessages, assistantMsg]);
    setEditingMessageId(null);
    setEditContent('');
    setIsStreaming(true);
    setErrorMessage(null);

    try {
      await sendStreamingMessage(token, conversationId, trimmed, {
        onChunk: (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
        onComplete: () => {
          setIsStreaming(false);
          getConversations(token)
            .then((convList) => {
              const current = convList.find((c) => c.id === conversationId);
              if (current?.title) setTitle(current.title);
            })
            .catch(() => {});
        },
        onError: (err: Error) => {
          if (isAuthError(err)) {
            clearToken();
            router.replace('/login' as Route);
            return;
          }
          setErrorMessage(err.message);
          setIsStreaming(false);
          // Rollback if transmission fails completely
          setMessages(originalMessages);
        },
      });
    } catch {
      setIsStreaming(false);
      setMessages(originalMessages);
    }
  }

  function handleStartEdit(msg: Message) {
    if (isStreaming || isRegenerating) return;
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  }

  function handleCancelEdit() {
    setEditingMessageId(null);
    setEditContent('');
  }

  async function handleRegenerate(assistantMessageId: number) {
    if (
      isStreaming ||
      isRegenerating ||
      loadingMessages ||
      !conversationId
    ) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    setIsRegenerating(true);
    setErrorMessage(null);

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
    } catch (err) {
      if (isAuthError(err)) {
        clearToken();
        router.replace('/login' as Route);
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to regenerate response.',
      );
      if (previousContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: previousContent }
              : msg,
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSend();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && !isRegenerating) {
        handleSend();
      }
    }
  }

  const latestAssistantMessageId = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')?.id;

  const latestUserMessageId = [...messages]
    .reverse()
    .find((m) => m.role === 'user')?.id;

  return (
    <div className="relative flex h-[calc(100vh-theme(spacing.12))] md:h-screen w-full flex-col overflow-hidden bg-canvas text-content-primary">
      {/* Workspace Header */}
      <header className="shrink-0 flex items-center justify-between border-b border-border-subtle px-4 py-3 sm:px-6 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/mentor"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface text-content-secondary transition hover:bg-surface-hover hover:text-content-primary"
            aria-label="Back to Mentor Workspace"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-content-primary truncate">
              {title}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isStreaming
                    ? 'bg-status-info animate-pulse'
                    : isRegenerating
                    ? 'bg-accent-violet animate-pulse'
                    : 'bg-status-success'
                }`}
              />
              <p className="text-[10px] text-content-muted">
                {isStreaming
                  ? 'Streaming live response...'
                  : isRegenerating
                  ? 'Regenerating...'
                  : loadingMessages
                  ? 'Loading history...'
                  : 'Live AI Mentor'}
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/mentor"
          className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover hover:text-content-primary"
        >
          All Conversations
        </Link>
      </header>

      {/* Message Stream Area */}
      <section className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {errorMessage && (
              <ContentCallout variant="danger" title="Connection Notice">
                {errorMessage}
              </ContentCallout>
            )}

            {loadingMessages ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-3" />
                <p className="text-xs text-content-muted">Loading conversation history...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center max-w-md mx-auto">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-xl text-brand border border-brand-border">
                  ⚡
                </div>
                <h3 className="text-base font-bold text-content-primary">
                  Start Technical Discussion
                </h3>
                <p className="mt-1 text-xs text-content-muted leading-relaxed">
                  Ask technical questions, explore code snippets, and receive live streaming guidance.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                const isLatestAssistant =
                  isAssistant && msg.id === latestAssistantMessageId;
                const isLatestUser =
                  !isAssistant && msg.id === latestUserMessageId;
                const isEditing = editingMessageId === msg.id;
                const isCopied = copiedMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isAssistant ? 'items-start' : 'items-end'
                    }`}
                  >
                    {!isAssistant ? (
                      <div className="flex flex-col items-end w-full max-w-[92%] sm:max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1 text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                          <span>You</span>
                          {isLatestUser && !isEditing && !isStreaming && !isRegenerating && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="text-[10px] lowercase text-brand font-medium hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="w-full rounded-2xl border border-brand bg-surface p-3 shadow-elevated">
                            <textarea
                              ref={editTextareaRef}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              className="w-full resize-none bg-transparent font-sans text-sm text-content-primary outline-none"
                            />
                            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border-subtle pt-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="rounded-lg px-2.5 py-1 text-xs font-medium text-content-secondary transition hover:bg-surface-hover"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(msg.id)}
                                disabled={!editContent.trim()}
                                className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                              >
                                Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl rounded-tr-sm border border-border bg-surface-elevated px-4 py-3 text-sm leading-relaxed text-content-primary shadow-subtle whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full max-w-full sm:max-w-[95%]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-cyan-500 text-[10px] font-bold text-slate-950 shadow-subtle shrink-0">
                            TS
                          </div>
                          <span className="text-xs font-bold text-content-primary tracking-tight">
                            AI Mentor
                          </span>
                          {isStreaming && !msg.content && isLatestAssistant && (
                            <span className="flex items-center gap-1 text-[10px] text-brand font-medium animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                              Thinking...
                            </span>
                          )}
                        </div>

                        <div className="rounded-2xl rounded-tl-sm border border-border-subtle bg-surface p-4 sm:p-5 text-sm leading-relaxed shadow-subtle">
                          {msg.content ? (
                            <MarkdownRenderer content={msg.content} />
                          ) : (
                            (isStreaming && msg.id === assistantMsgIdRef.current) ||
                            (isRegenerating && isLatestAssistant) ? (
                              <div className="flex items-center gap-2 py-2 text-xs text-content-muted">
                                <span className="h-2 w-2 animate-ping rounded-full bg-brand" />
                                <span className="italic">
                                  {isRegenerating
                                    ? 'Regenerating technical response...'
                                    : 'Analyzing and generating response...'}
                                </span>
                              </div>
                            ) : null
                          )}
                        </div>

                        {/* Assistant Action Bar */}
                        {msg.content && !isStreaming && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyResponse(msg.id, msg.content)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-medium text-content-secondary transition hover:bg-surface-hover hover:text-content-primary"
                              aria-label="Copy full response"
                            >
                              <span>{isCopied ? '✓' : '⎘'}</span>
                              <span>{isCopied ? 'Copied' : 'Copy Response'}</span>
                            </button>

                            {isLatestAssistant && (
                              <button
                                type="button"
                                onClick={() => handleRegenerate(msg.id)}
                                disabled={isRegenerating || isStreaming}
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
                                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border-subtle bg-surface/90 p-3 sm:p-4 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
            <div className="relative rounded-xl border border-border bg-surface shadow-elevated transition focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
              <div className="flex items-end gap-2 p-2.5">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isStreaming || isRegenerating
                      ? 'Mentor is streaming response...'
                      : 'Ask your AI mentor anything... (Shift+Enter for newline)'
                  }
                  rows={1}
                  disabled={isStreaming || isRegenerating || loadingMessages}
                  className="max-h-36 min-h-[42px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-content-primary outline-none placeholder:text-content-muted disabled:opacity-60"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !message.trim() ||
                    isStreaming ||
                    isRegenerating ||
                    loadingMessages
                  }
                  isLoading={isStreaming || isRegenerating}
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
      </section>
    </div>
  );
}
