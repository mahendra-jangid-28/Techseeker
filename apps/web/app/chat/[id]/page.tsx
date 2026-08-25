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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const assistantMsgIdRef = useRef<number | null>(null);

  // Auto-scroll on new messages / chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, isRegenerating]);

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
    if (!trimmed || isStreaming || isRegenerating || loadingMessages || !conversationId) return;

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    // 1. User bubble appears immediately
    const userMsgId = Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    // 2. Assistant bubble appears empty
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
          // 3. As chunks arrive, append text into the same assistant bubble
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
          // If title was "New Chat", refresh conversation title
          getConversations(token).then((convList) => {
            const current = convList.find((c) => c.id === conversationId);
            if (current?.title) setTitle(current.title);
          }).catch(() => {});
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
    } catch (err) {
      setIsStreaming(false);
    }
  }

  async function handleRegenerate(assistantMessageId: number) {
    if (isStreaming || isRegenerating || loadingMessages || !conversationId) return;

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
        msg.id === assistantMessageId
          ? { ...msg, content: '' }
          : msg
      )
    );

    try {
      const regeneratedMsg = await regenerateMessage(token, assistantMessageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? regeneratedMsg
            : msg
        )
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
              : msg
          )
        );
      }
    } finally {
      setIsRegenerating(false);
    }
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.08] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[25rem] w-[25rem] rounded-full bg-violet-500/[0.07] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/mentor"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:border-white/[0.15] hover:text-white"
            >
              ←
            </Link>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                {title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <p className="text-[11px] text-slate-500">Live Streaming AI Mentor</p>
              </div>
            </div>
          </div>

          <Link
            href="/mentor"
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            All Conversations
          </Link>
        </header>

        {/* Chat Message Stream Area */}
        <section className="flex min-h-0 flex-1 flex-col justify-between">
          <div className="flex-1 overflow-y-auto py-6">
            <div className="mx-auto flex w-full flex-col gap-5">
              {errorMessage && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-300">
                  {errorMessage}
                </div>
              )}

              {loadingMessages ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading conversation history...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-xl text-sky-300">
                    ✦
                  </div>
                  <h3 className="text-lg font-bold text-white">Start the Discussion</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Ask your technical questions, explore code, and receive real-time streaming feedback.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`flex max-w-[85%] gap-3 sm:max-w-[75%] ${
                        msg.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          msg.role === 'assistant'
                            ? 'bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/20'
                            : 'border border-white/[0.08] bg-white/[0.05] text-slate-300'
                        }`}
                      >
                        {msg.role === 'assistant' ? 'TS' : 'YOU'}
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'assistant'
                            ? 'rounded-tl-md border border-white/[0.07] bg-white/[0.035] text-slate-200'
                            : 'rounded-tr-md bg-gradient-to-br from-sky-400 to-cyan-400 text-slate-950 font-medium shadow-md shadow-sky-500/10'
                        }`}
                      >
                        {msg.content || (
                          (isStreaming && msg.id === assistantMsgIdRef.current) || (isRegenerating && msg.id === latestAssistantMessageId) ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 italic text-xs">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                              {isRegenerating ? 'Regenerating response...' : 'Generating response...'}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>

                    {/* Regenerate Button under latest assistant message */}
                    {msg.role === 'assistant' && msg.id === latestAssistantMessageId && !isStreaming && (
                      <div className="mt-1.5 ml-11 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRegenerate(msg.id)}
                          disabled={isRegenerating || isStreaming}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className={`text-xs ${isRegenerating ? 'animate-spin' : ''}`}>↺</span>
                          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="pt-2 pb-4">
            <form onSubmit={handleSubmit} className="mx-auto w-full">
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-slate-900/80 shadow-2xl backdrop-blur-xl transition focus-within:border-sky-400/30">
                <div className="flex items-end gap-2 p-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isStreaming || isRegenerating
                        ? 'Mentor is typing...'
                        : 'Ask your AI mentor anything...'
                    }
                    rows={1}
                    disabled={isStreaming || isRegenerating}
                    className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || isStreaming || isRegenerating || loadingMessages}
                    className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 px-4 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  >
                    {isStreaming ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-ping rounded-full bg-slate-950" />
                        <span>Streaming</span>
                      </span>
                    ) : isRegenerating ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        <span>Regenerating</span>
                      </span>
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
